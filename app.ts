import "dotenv/config";
import express, { Request, Response } from "express";
import sequelize from "./config/db";

import contactRouter from "./routes/contact.routes";

const app = express();
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
});

app.use("/api/contact", contactRouter);

const PORT = process.env.PORT || 8000;

sequelize
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
