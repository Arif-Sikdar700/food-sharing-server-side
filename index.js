const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const cors = require("cors");

require("dotenv").config();
const PORT = process.env.PORT || 5000;
const cookieParser = require("cookie-parser");
const app = express();

app.use(
	cors({
		origin: [
			"http://localhost:5173",
			"https://foodsharing-49ddc.web.app",
			"https://foodsharing-49ddc.firebaseapp.com",
		],
		credentials: true,
	})
);
app.use(cookieParser());
app.use(express.json());

const verifyToken = (req, res, next) => {
	const token = req.cookies?.token;
	if (!token) {
		return res.status(401).send({ message: "unauthorized access" });
	}
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
		if (err) {
			return res.status(401).send({ message: "unauthorized access" });
		}
		req.user = decoded;
		next();
	});
};

app.get("/", (req, res) => {
	res.send("Hello, World!"); // or serve your HTML
});

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@cluster0.haw69.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		// await client.connect();
		// Send a ping to confirm a successful connection
		// await client.db("admin").command({ ping: 1 });
		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);
		const foodCollection = client.db("FoodDB").collection("Food");
		const myFoodCollection = client.db("MyFoodDB").collection("MyFood");
		// food add
		app.post("/food", async (req, res) => {
			const foodData = req.body;
			const result = await foodCollection.insertOne(foodData);
			res.send(result);
		});
		// get food data 6 hight data
		app.get("/food-hight", async (req, res) => {
			const cursor = foodCollection.find().sort({ foodQuantity: -1 }).limit(6);
			const result = await cursor.toArray();

			res.send(result);
		});
		// all food
		app.get("/allfood", async (req, res) => {
			const result = await foodCollection
				.find({ status: "available" })
				.toArray();
			res.send(result);
		});
		// single data
		app.get("/singleData/:id", async (req, res) => {
			const { id } = req.params;
			const query = { _id: new ObjectId(id) };
			const result = await foodCollection.findOne(query);
			res.send(result);
		});
		// my food
		app.get("/myfood/:email", verifyToken, async (req, res) => {
			const email = req.params.email;

			const querry = { userEmail: email };
			if (req.user.email !== req.params.email) {
				return res.status(403).send({ message: "forbidden access" });
			}
			const result = await myFoodCollection.find(querry).toArray();
			res.send(result);
		});

		app.get("/manageMyFood/:email", verifyToken, async (req, res) => {
			const email = req.params.email;
			const querry = { email };
			if (req.user.email !== req.params.email) {
				return res.status(403).send({ message: "forbidden access" });
			}
			const result = await foodCollection.find(querry).toArray();
			res.send(result);
		});

		// manage my food Delete
		app.delete("/manageMyFood/:id", async (req, res) => {
			const id = req.params.id;
			const querry = { _id: new ObjectId(id) };
			const result = await foodCollection.deleteOne(querry);
			res.send(result);
		});

		app.patch("/manageMyFood/:id", async (req, res) => {
			const id = req.params.id;

			const filter = { _id: new ObjectId(id) };
			const options = { upsert: true };
			const data = req.body;

			const updateData = {
				$set: {
					foodName: data.foodName,
					foodImage: data.foodImage,
					foodQuantity: data.foodQuantity,
					pickupLocation: data.pickupLocation,
					expireDate: data.expireDate,
					aditionalInfo: data.aditionalInfo,
				},
			};
			const result = await foodCollection.updateOne(
				filter,
				updateData,
				options
			);

			res.send(result);
		});
		app.post("/foodRequest", async (req, res) => {
			const data = req.body;
			const result = await myFoodCollection.insertOne(data);
			const filter = { _id: new ObjectId(data.foodId) };

			const update = {
				$set: {
					status: "requested",
				},
			};
			const updateStatus = await foodCollection.updateOne(filter, update);
			res.send(result);
		});
		// jwt token
		app.post("/jwt", async (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: "5h",
			});
			res
				.cookie("token", token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
				})
				.send({ success: true });
		});
		app.post("/logout", (req, res) => {
			res
				.clearCookie("token", {
					httpOnly: true,
					secure: false,
				})
				.send({ success: true });
		});
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
