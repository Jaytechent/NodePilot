import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../../types';

export interface IUserDocument extends Document {
  _id: any; // Map to standard string id
}

const UserSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    passwordHash: { type: String },
    walletAddress: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['Admin', 'Operator', 'Customer', 'Support'], default: 'Customer' },
    balance: { type: Number, default: 500.0 },
  },
  {
    timestamps: true,
    _id: false, // Use our own string _id
  }
);

// Virtual field for clean 'id' access
UserSchema.virtual('id').get(function (this: any) {
  return this._id;
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

export const UserModel = mongoose.models.User || mongoose.model<any>('User', UserSchema);
