import mongoose, { Document, Schema } from "mongoose";

export interface IFormSubmission extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  salesPerson: string;
  clientName: string;
  designation: string;
  modeOfCommunication: string;
  formType: string;
  company?: string;
  sector: string;
  cmpTarget?: string;
  recommendation?: string;
  analystName: string;
  buySideAnalystDesignation: string;
  rationale: string;
  feedback: string;
  others: string;
  submittedAt: Date;
}

const FormSubmissionSchema = new Schema<IFormSubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, default: "" },
    salesPerson: { type: String, default: "" },
    clientName: { type: String, default: "" },
    designation: { type: String, default: "" },
    modeOfCommunication: { type: String, default: "" },
    formType: { type: String, default: "" },
    company: { type: String, default: "" },
    sector: { type: String, default: "" },
    cmpTarget: { type: String, default: "" },
    recommendation: { type: String, default: "" },
    analystName: { type: String, default: "" },
    buySideAnalystDesignation: { type: String, default: "" },
    rationale: { type: String, default: "" },
    feedback: { type: String, default: "" },
    others: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

FormSubmissionSchema.index({ createdAt: -1 });
FormSubmissionSchema.index({ userId: 1 });
FormSubmissionSchema.index({ userId: 1, createdAt: -1 });

export const FormSubmission =
  mongoose.models.FormSubmission ??
  mongoose.model<IFormSubmission>("FormSubmission", FormSubmissionSchema);
