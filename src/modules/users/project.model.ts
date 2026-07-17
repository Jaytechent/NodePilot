import mongoose, { Schema, Document } from 'mongoose';
import { IProject } from '../../types';

export interface IProjectDocument extends Document {
  _id: any;
}

const ProjectSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    userId: { type: String, required: true, ref: 'User' },
  },
  {
    timestamps: true,
    _id: false,
  }
);

ProjectSchema.virtual('id').get(function (this: any) {
  return this._id;
});

ProjectSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const ProjectModel = mongoose.models.Project || mongoose.model<any>('Project', ProjectSchema);
