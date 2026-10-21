
import express from 'express';
import { MongoClient } from 'mongodb';
import 'dotenv/config';
import cors from 'cors';
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_DB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();

    const database = client.db("hireloop_db");
    const jobCollection = database.collection("jobs");
    const companyCollection = database.collection("companies");

    app.get('/api/jobs', async(req, res) =>{
            const query = {};
            if(req.query.companyId){
                query.companyId = req.query.companyId;
            }
            if(req.query.status){
                query.status = req.query.status;
            }
            const cursor = jobCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

    app.post('/api/jobs', async (req, res) =>{
        const job = req.body;
        const result = await jobCollection.insertOne(job);
        res.send(result);
    })


    console.log('You successfully connected to MongoDB!');
    return client;
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    throw err;
  }
}

export async function disconnectFromMongoDB() {
//   await client.close();
}

app.get('/', (req, res) => {
  res.send('This is the hireloop server.');
});

async function startServer() {
  try {
    await connectToMongoDB();

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    process.exitCode = 1;
  }
}

startServer();
