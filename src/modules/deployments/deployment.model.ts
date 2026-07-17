import mongoose, { Schema, Document } from 'mongoose';
import { IDeployment } from '../../types';

export interface IDeploymentDocument extends Document {
  _id: any;
}

const DeploymentSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    serverId: { type: String, required: true, ref: 'Server' },
    projectId: { type: String, required: true, ref: 'Project' },
    blockchainId: { type: String, required: true },
    nodeType: { type: String, enum: ['validator', 'full', 'rpc'], required: true },
    status: {
      type: String,
      enum: ['pending', 'provisioning', 'active', 'failed', 'updating', 'restarting', 'deleting'],
      default: 'pending',
    },
    config: { type: Schema.Types.Mixed, default: {} },
    vpsCost: { type: Number, default: 0 },
    storageCost: { type: Number, default: 0 },
    bandwidthCost: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    billingStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'overdue', 'refunded'],
      default: 'unpaid',
    },
    infrastructureStatus: {
      type: String,
      enum: ['unprovisioned', 'provisioning', 'active', 'failed', 'destroyed'],
      default: 'unprovisioned',
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

DeploymentSchema.virtual('id').get(function (this: any) {
  return this._id;
});

DeploymentSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const DeploymentModel = mongoose.models.Deployment || mongoose.model<any>('Deployment', DeploymentSchema);
