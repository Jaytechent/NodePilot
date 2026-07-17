import mongoose, { Schema, Document } from 'mongoose';
import { IDeploymentJob } from '../../types';

export interface IDeploymentJobDocument extends Document {
  _id: any;
}

const DeploymentJobSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    deploymentId: { type: String, required: true, ref: 'Deployment' },
    action: {
      type: String,
      enum: ['deploy', 'update', 'restart', 'delete', 'backup', 'restore'],
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
    },
    progress: { type: Number, default: 0 },
    logs: [{ type: String }],
  },
  {
    timestamps: true,
    _id: false,
  }
);

DeploymentJobSchema.virtual('id').get(function (this: any) {
  return this._id;
});

DeploymentJobSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const DeploymentJobModel = mongoose.models.DeploymentJob || mongoose.model<any>('DeploymentJob', DeploymentJobSchema);
