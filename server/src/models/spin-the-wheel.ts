import { Schema, model } from 'mongoose';

import { stringNotEmpty } from '../validators/global.ts';

export interface IEntry {
  name: string;
  weight: number;
  private: boolean;
}

export interface IResults {
  entryName: string;
  private: boolean;
}

const entrySchema = new Schema<IEntry>(
  {
    name: {
      type: String,
      required: [true, 'Entry name is required.'],
      trim: true,
      validate: stringNotEmpty,
    },
    weight: {
      type: Number,
      required: [true, 'Entry weight is required.'],
      min: [0.001, 'Weight cannot be 0 or below.'],
      max: [0.999, 'Weight cannot be 1 or more.']
    },
    private: {
      type: Boolean,
      required: [true, 'Entry privacy level is required.'],
      default: false,
    }
  },
);

const resultsSchema = new Schema<IResults>(
  {
    entryName: {
      type: String,
      required: [true, 'Entry name is required.'],
      trim: true,
      validate: stringNotEmpty,
    },
    private: {
      type: Boolean,
      required: [true, 'Entry privacy level is required.'],
      default: false,
    }
  },
);

export const Entry = model<IEntry>('WheelEntry', entrySchema);
export const Results = model<IResults>('WheelResults', resultsSchema);
