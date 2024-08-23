require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
let db, userCollection, productsCollection, ordersCollection;

// Establishing MongoDB Connection
const connectDB = async () => {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB");

    db = client.db("RQ_Analytics");
    userCollection = db.collection("shopifyCustomers");
    productsCollection = db.collection("shopifyProducts");
    ordersCollection = db.collection("shopifyOrders");

    // Start the server after the connection is established
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1); // Exit the process with failure if DB connection fails
  }
};

// Routes

// Get all products
app.get("/api/v1/products", async (req, res) => {
  try {
    const products = await productsCollection.find().toArray();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all orders
app.get("/api/v1/users", async (req, res) => {
  try {
    const orders = await ordersCollection.find().toArray();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/api/v1/orders", async (req, res) => {
  try {
    const orders = await ordersCollection.find().toArray();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/v1/total-sales", async (req, res) => {
  try {
    const result = await ordersCollection
      .aggregate([
        {
          $addFields: {
            // Ensure the created_at field is converted to a Date type
            createdAt: { $toDate: "$created_at" },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalSales: { $sum: { $toDouble: "$total_price" } },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 },
        },
      ])
      .toArray();

    res.json(result);
  } catch (error) {
    console.error("Error fetching total sales:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/v1/sales-growth", async (req, res) => {
  try {
    const salesData = await ordersCollection
      .aggregate([
        {
          $addFields: {
            // Ensure the created_at field is converted to a Date type
            createdAt: { $toDate: "$created_at" },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalSales: { $sum: { $toDouble: "$total_price" } },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 },
        },
      ])
      .toArray();

    // Calculate sales growth rate
    const growthData = salesData.map((current, index, array) => {
      if (index === 0) {
        return {
          period: `${current._id.month}/${current._id.year}`,
          totalSales: current.totalSales,
          growthRate: null, // No growth rate for the first period
        };
      }

      const previous = array[index - 1];
      const growthRate =
        ((current.totalSales - previous.totalSales) / previous.totalSales) *
        100;

      return {
        period: `${current._id.month}/${current._id.year}`,
        totalSales: current.totalSales,
        growthRate: growthRate.toFixed(2), // Round to 2 decimal places
      };
    });

    res.json(growthData);
  } catch (error) {
    console.error("Error fetching sales growth data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});

// Connect to the database
connectDB();
