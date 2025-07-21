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
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
