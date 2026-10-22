import { Schema, model } from 'mongoose';

const activitySchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  team: { type: Schema.Types.ObjectId, required: true, ref: 'Team' },
  type: { type: String, required: true },
  minutes: { type: Number, required: true },
  points: { type: Number, required: true },
  occurredAt: { type: Date, required: true },
});

export const Activity = model('Activity', activitySchema);
