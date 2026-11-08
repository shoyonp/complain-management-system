import mongoose from 'mongoose';
import { PERMISSIONS, ROLES, USER_STATUS } from '../../config/constants.js';

const studentProfileSchema = new mongoose.Schema(
  {
    studentId: { type: String, trim: true },
    academicDepartment: { type: String, trim: true },
    batch: { type: String, trim: true },
    semester: { type: String, trim: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 30 },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.STUDENT,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING,
      required: true,
    },
    studentProfile: { type: studentProfileSchema, default: undefined },
    departmentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    permissions: {
      type: [{ type: String, enum: Object.values(PERMISSIONS) }],
      default: [],
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    // Admin-only note recorded with a verification decision.
    verificationNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'studentProfile.studentId': 1 }, { unique: true, sparse: true });

export const User = mongoose.model('User', userSchema);
