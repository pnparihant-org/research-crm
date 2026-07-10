import mongoose, { Document, Schema } from "mongoose";

export interface IAssignedClient {
  client: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  assignedByName: string;
  assignedAt: Date;
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: "user" | "admin" | "master_admin";
  dept?: "research" | "institution" | null;
  designation?: string | null;
  twoFactorSecret: string | null;
  twoFactorEnabled: boolean;
  assignedClients: IAssignedClient[];
  phone?: string | null;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
  mpin?: string | null;
  loginOtp?: string | null;
  loginOtpExpiry?: Date | null;
  lastActiveAt?: Date | null;
  createdAt: Date;
}

const AssignedClientSchema = new Schema<IAssignedClient>(
  {
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedByName: { type: String, required: true },
    assignedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["user", "admin", "master_admin"], default: "user" },
    dept: { type: String, enum: ["research", "institution", null], default: null },
    designation: { type: String, default: null },
    twoFactorSecret: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    assignedClients: { type: [AssignedClientSchema], default: [] },
    phone: { type: String, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    mpin: { type: String, default: null },
    loginOtp: { type: String, default: null },
    loginOtpExpiry: { type: Date, default: null },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
