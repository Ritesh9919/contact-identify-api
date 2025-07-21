import { Request, Response } from "express";
import Contact from "../models/contact.model";
import { Op } from "sequelize";

export const identifyContact = async (req: Request, res: Response) => {
  try {
    let { email, phoneNumber } = req.body;

    // Convert phoneNumber to string if it's a number
    if (
      phoneNumber !== undefined &&
      phoneNumber !== null &&
      typeof phoneNumber === "number"
    ) {
      phoneNumber = phoneNumber.toString();
    }

    // Validate input - either email or phoneNumber should be present
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "At least one of email or phoneNumber m`ust be provided",
      });
    }

    // Find matching contacts
    const whereClause: any = { [Op.or]: [] };
    if (email) whereClause[Op.or].push({ email });
    if (phoneNumber) whereClause[Op.or].push({ phoneNumber });

    const matchingContacts = await Contact.findAll({ where: whereClause });

    // If no matches, create new primary contact
    if (matchingContacts.length === 0) {
      const newContact = await Contact.create({
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkedId: null,
        linkPrecedence: "primary",
      });

      return res.status(201).json({
        contact: {
          primaryContatctId: newContact.id,
          emails: newContact.email ? [newContact.email] : [],
          phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    // Find all primary contacts in the matching group
    const primaryContacts = new Set<number>();
    for (const contact of matchingContacts) {
      let currentContact: Contact = contact;
      while (
        currentContact.linkPrecedence === "secondary" &&
        currentContact.linkedId !== null
      ) {
        const nextContact = await Contact.findByPk(currentContact.linkedId);
        if (!nextContact) break;
        currentContact = nextContact;
      }
      if (currentContact.linkPrecedence === "primary") {
        primaryContacts.add(currentContact.id);
      }
    }

    // Get all related contacts
    let allRelatedContacts = await Contact.findAll({
      where: {
        [Op.or]: [
          { id: Array.from(primaryContacts) },
          { linkedId: Array.from(primaryContacts) },
        ],
      },
    });

    // If multiple primary contacts, merge them
    if (primaryContacts.size > 1) {
      const sortedPrimaries = allRelatedContacts
        .filter(
          (c) => c.linkPrecedence === "primary" && primaryContacts.has(c.id)
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      const oldestPrimary = sortedPrimaries[0];
      const otherPrimaries = sortedPrimaries.slice(1);

      // Convert other primaries to secondary
      for (const primary of otherPrimaries) {
        await Contact.update(
          {
            linkPrecedence: "secondary",
            linkedId: oldestPrimary.id,
            updatedAt: new Date(),
          },
          { where: { id: primary.id } }
        );

        // Update all contacts linked to this primary
        await Contact.update(
          { linkedId: oldestPrimary.id },
          { where: { linkedId: primary.id } }
        );
      }

      // Refresh the contact list
      allRelatedContacts = await Contact.findAll({
        where: {
          [Op.or]: [{ id: oldestPrimary.id }, { linkedId: oldestPrimary.id }],
        },
      });
      primaryContacts.clear();
      primaryContacts.add(oldestPrimary.id);
    }

    const primaryId = Array.from(primaryContacts)[0];
    const primaryContact = allRelatedContacts.find((c) => c.id === primaryId)!;

    // Check if we need to create a new secondary contact
    const existingEmails = new Set(
      allRelatedContacts.map((c) => c.email).filter(Boolean)
    );
    const existingPhones = new Set(
      allRelatedContacts.map((c) => c.phoneNumber).filter(Boolean)
    );

    if (
      (email && !existingEmails.has(email)) ||
      (phoneNumber && !existingPhones.has(phoneNumber))
    ) {
      await Contact.create({
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkedId: primaryId,
        linkPrecedence: "secondary",
      });

      // Refresh the contact list
      allRelatedContacts = await Contact.findAll({
        where: {
          [Op.or]: [{ id: primaryId }, { linkedId: primaryId }],
        },
      });
    }

    // Prepare response
    const emails = Array.from(
      new Set(
        allRelatedContacts
          .map((c) => c.email)
          .filter((email): email is string => Boolean(email))
      )
    );

    if (primaryContact.email) {
      emails.sort(
        (a, b) =>
          (a === primaryContact.email ? -1 : 0) -
          (b === primaryContact.email ? -1 : 0)
      );
    }

    const phoneNumbers = Array.from(
      new Set(
        allRelatedContacts
          .map((c) => c.phoneNumber)
          .filter((phone): phone is string => Boolean(phone))
      )
    );

    if (primaryContact.phoneNumber) {
      phoneNumbers.sort(
        (a, b) =>
          (a === primaryContact.phoneNumber ? -1 : 0) -
          (b === primaryContact.phoneNumber ? -1 : 0)
      );
    }

    const secondaryContactIds = allRelatedContacts
      .filter((c) => c.linkPrecedence === "secondary")
      .map((c) => c.id)
      .sort((a, b) => a - b);

    return res.json({
      contact: {
        primaryContatctId: primaryId,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
