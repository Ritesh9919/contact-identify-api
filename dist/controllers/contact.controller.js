"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyContact = void 0;
const contact_model_1 = __importDefault(require("../models/contact.model"));
const sequelize_1 = require("sequelize");
const identifyContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { email, phoneNumber } = req.body;
        // Convert phoneNumber to string if it's a number
        if (phoneNumber !== undefined &&
            phoneNumber !== null &&
            typeof phoneNumber === "number") {
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
        const whereClause = { [sequelize_1.Op.or]: [] };
        if (email)
            whereClause[sequelize_1.Op.or].push({ email });
        if (phoneNumber)
            whereClause[sequelize_1.Op.or].push({ phoneNumber });
        const matchingContacts = yield contact_model_1.default.findAll({ where: whereClause });
        // If no matches, create new primary contact
        if (matchingContacts.length === 0) {
            const newContact = yield contact_model_1.default.create({
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
        const primaryContacts = new Set();
        for (const contact of matchingContacts) {
            let currentContact = contact;
            while (currentContact.linkPrecedence === "secondary" &&
                currentContact.linkedId !== null) {
                const nextContact = yield contact_model_1.default.findByPk(currentContact.linkedId);
                if (!nextContact)
                    break;
                currentContact = nextContact;
            }
            if (currentContact.linkPrecedence === "primary") {
                primaryContacts.add(currentContact.id);
            }
        }
        // Get all related contacts
        let allRelatedContacts = yield contact_model_1.default.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { id: Array.from(primaryContacts) },
                    { linkedId: Array.from(primaryContacts) },
                ],
            },
        });
        // If multiple primary contacts, merge them
        if (primaryContacts.size > 1) {
            const sortedPrimaries = allRelatedContacts
                .filter((c) => c.linkPrecedence === "primary" && primaryContacts.has(c.id))
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            const oldestPrimary = sortedPrimaries[0];
            const otherPrimaries = sortedPrimaries.slice(1);
            // Convert other primaries to secondary
            for (const primary of otherPrimaries) {
                yield contact_model_1.default.update({
                    linkPrecedence: "secondary",
                    linkedId: oldestPrimary.id,
                    updatedAt: new Date(),
                }, { where: { id: primary.id } });
                // Update all contacts linked to this primary
                yield contact_model_1.default.update({ linkedId: oldestPrimary.id }, { where: { linkedId: primary.id } });
            }
            // Refresh the contact list
            allRelatedContacts = yield contact_model_1.default.findAll({
                where: {
                    [sequelize_1.Op.or]: [{ id: oldestPrimary.id }, { linkedId: oldestPrimary.id }],
                },
            });
            primaryContacts.clear();
            primaryContacts.add(oldestPrimary.id);
        }
        const primaryId = Array.from(primaryContacts)[0];
        const primaryContact = allRelatedContacts.find((c) => c.id === primaryId);
        // Check if we need to create a new secondary contact
        const existingEmails = new Set(allRelatedContacts.map((c) => c.email).filter(Boolean));
        const existingPhones = new Set(allRelatedContacts.map((c) => c.phoneNumber).filter(Boolean));
        if ((email && !existingEmails.has(email)) ||
            (phoneNumber && !existingPhones.has(phoneNumber))) {
            yield contact_model_1.default.create({
                email: email || null,
                phoneNumber: phoneNumber || null,
                linkedId: primaryId,
                linkPrecedence: "secondary",
            });
            // Refresh the contact list
            allRelatedContacts = yield contact_model_1.default.findAll({
                where: {
                    [sequelize_1.Op.or]: [{ id: primaryId }, { linkedId: primaryId }],
                },
            });
        }
        // Prepare response
        const emails = Array.from(new Set(allRelatedContacts
            .map((c) => c.email)
            .filter((email) => Boolean(email))));
        if (primaryContact.email) {
            emails.sort((a, b) => (a === primaryContact.email ? -1 : 0) -
                (b === primaryContact.email ? -1 : 0));
        }
        const phoneNumbers = Array.from(new Set(allRelatedContacts
            .map((c) => c.phoneNumber)
            .filter((phone) => Boolean(phone))));
        if (primaryContact.phoneNumber) {
            phoneNumbers.sort((a, b) => (a === primaryContact.phoneNumber ? -1 : 0) -
                (b === primaryContact.phoneNumber ? -1 : 0));
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
    }
    catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
});
exports.identifyContact = identifyContact;
