import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    organization: String,
    description: String,
    venue: String,
    registrationLink: String,
    date: String,
    poster: String,
    category: { type: String, required: true }, // Event category/tab (e.g., 'red-oak', 'amazon-forest')
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);
export default Event;
