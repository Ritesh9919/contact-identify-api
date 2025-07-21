"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./config/db"));
const contact_routes_1 = __importDefault(require("./routes/contact.routes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Hello World");
});
app.use("/api/contact", contact_routes_1.default);
const PORT = process.env.PORT || 8000;
db_1.default
    .sync({ force: true })
    .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => {
        console.log(`Server is running on port:${PORT}`);
    });
})
    .catch((err) => {
    console.error("Failed to sync database:", err);
});
