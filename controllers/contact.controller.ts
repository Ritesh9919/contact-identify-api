import { Request, Response } from "express";
import Contact from "../models/contact.model";

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
      return res
        .status(400)
        .json({
          success: false,
          message: "At least one of email or phoneNumber must be provided",
        });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
