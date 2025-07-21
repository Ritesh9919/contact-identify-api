import { Request, Response } from "express";
import Contact from "../models/contact.model";
import { Op } from "sequelize";

export const identifyContact = async (req: Request, res: Response) => {
  try {
    let { email, phoneNumber } = req.body;
    // Coverting phoneNumber to string if it's number
    if (
      phoneNumber !== undefined &&
      phoneNumber !== null &&
      typeof phoneNumber === "number"
    ) {
      phoneNumber = phoneNumber.toString();
    }

    // Validating input
    if (!email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "At least one of email or phoneNumber must be provided",
      });
    }

    // Finding matching contacts
    const whereClause: any = { [Op.or]: [] };
    if (email) whereClause[Op.or].push({ email });
    if (phoneNumber) whereClause[Op.or].push({ phoneNumber });
    const matchingContacts = await Contact.findAll({ where: whereClause });

    // if no matching, create new primary contact
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
    const allRelatedContacts = await Contact.findAll({
      where: {
        [Op.or]: [
          { id: Array.from(primaryContacts) },
          { lindedId: Array.from(primaryContacts) },
        ],
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
