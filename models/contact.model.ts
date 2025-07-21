import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";

class Contact extends Model {
  public id!: number;
  phoneNumber!: string | null;
  public email!: string | null;
  public linkedId!: number | null;
  public linkPrecedence!: "primary" | "secondary";
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

Contact.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    linkedId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    linkPrecedence: {
      type: DataTypes.ENUM("primary", "secondary"),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Contact",
    tableName: "contacts",
    paranoid: true,
    timestamps: true,
  }
);

export default Contact;
