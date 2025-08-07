import Event from "../models/event.js";

// @desc    Create new event
// @route   POST /api/events
// @access  Private
export const createEvent = async (req, res) => {
  try {
    console.log("=== CREATE EVENT CONTROLLER ===");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    console.log("Request user:", req.user ? `User ID: ${req.user._id}` : "No user");

    const { name, organization, description, venue, registrationLink, date, category } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Event name is required" });
    }

    if (!category) {
      return res.status(400).json({ message: "Event category is required" });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User authentication failed" });
    }

    // Check for existing event with same name, date, venue, and organization
    const existingEvent = await Event.findOne({
      name,
      date: date || "",
      venue: venue || "",
      organization: organization || ""
    });

    if (existingEvent) {
      return res.status(400).json({
        success: false,
        message: "An event with the same name, date, venue, and organization already exists"
      });
    }

    // Create event object
    const eventData = {
      name,
      organization: organization || "",
      description: description || "",
      venue: venue || "",
      registrationLink: registrationLink || "",
      date: date || "",
      category,
      poster: req.file ? `/uploads/${req.file.filename}` : null,
      createdBy: req.user._id,
    };

    console.log("Event data to save:", eventData);
    
    const event = new Event(eventData);
    const createdEvent = await event.save();

    console.log("Event created successfully:", createdEvent);


    await createdEvent.populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: createdEvent
    });

  } catch (error) {
    console.error("Error in createEvent controller:", error);
    console.error("Error stack:", error.stack);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: "Validation error", 
        errors 
      });
    }

    res.status(500).json({ 
      message: "Error creating event", 
      error: error.message 
    });
  }
};


export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching event', error: error.message });
  }
};

export const getEvents = async (req, res) => {
  try {
    console.log("=== GET EVENTS CONTROLLER ===");
    const { category } = req.query;
    console.log("Requested category:", category);

   
    const filter = category ? { category } : {};
    console.log("Filter applied:", filter);

    const events = await Event.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    console.log(`Found ${events.length} events`);

    res.json({
      success: true,
      count: events.length,
      events
    });

  } catch (error) {
    console.error("Error in getEvents controller:", error);
    res.status(500).json({ 
      message: "Error fetching events", 
      error: error.message 
    });
  }
};
