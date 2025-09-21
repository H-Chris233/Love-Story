import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IAnniversary extends Document {
  title: string;
  date: Date;
  reminderDays: number;
  user: IUser['_id'];
  createdAt: Date;
}

const anniversarySchema: Schema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  date: {
    type: Date,
    required: [true, 'Please add a date'],
  },
  reminderDays: {
    type: Number,
    default: 1,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IAnniversary>('Anniversary', anniversarySchema);