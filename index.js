
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
    const userCollection = database.collection("user");

    app.get('/api/users', async(req, res) =>{
            const cursor = userCollection.find();
            const result = await cursor.toArray();
            res.send(result);
    })

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
        const newJob ={
            ...job,
            createdAt: new Date()
        }
        const result = await jobCollection.insertOne(newJob);
        res.send(result);
    })

    // company related apis

    app.get('/api/companies', async (req, res) => {
        const cursor = companyCollection.find().skip(5);
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/api/my/companies', async(req, res) =>{
        const query = {};
        if(req.query.recruiterId){
            query.recruiterId = req.query.recruiterId;
        }
        const result = await companyCollection.findOne(query);
        res.send(result || {});
    })

    app.post('/api/companies', async(req, res) =>{
        const company = req.body;
        const newCompany = {
            ...company,
            createdAt: new Date()
        };
        const result = await companyCollection.insertOne(newCompany);
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
