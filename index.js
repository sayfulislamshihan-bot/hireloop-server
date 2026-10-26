
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import cors from 'cors';
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
    console.log('logger middleware logged', req.params);
    next();
}

const verifyToken = (req, res, next) => {
    console.log('headers', req.headers)
    const authHeader = req.headers?.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    next();
}

const client = new MongoClient(process.env.MONGO_DB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();

    const database = client.db("hireloop_db");
    const jobCollection = database.collection("jobs");
    const companyCollection = database.collection("companies");
    const userCollection = database.collection("user");
    const applicationsCollection = database.collection("applications");
    const planCollection = database.collection('plans');
    const subscriptionCollection = database.collection('subscriptions');

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

      app.get('/api/jobs/:id', async (req, res) => {
          const id = req.params.id;
          const query = {
              _id: new ObjectId(id)
          }
          const result = await jobCollection.findOne(query);
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


    // application related apis
    app.get('/api/applications', async (req, res) => {
      const query = {};
      if (req.query.applicantId) {
          query.applicantId = req.query.applicantId;
      }
      if (req.query.jobId) {
          query.jobId = req.query.jobId;
      }
      const cursor = applicationsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/api/applications', async (req, res) => {
        const application = req.body;
        const newApplication = {
            ...application,
            createdAt: new Date()
        }
        const result = await applicationsCollection.insertOne(newApplication);
        res.send(result);
    })


    // company related apis
    app.get('/api/companies',verifyToken, async (req, res) => {
        const cursor = companyCollection.find();
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


    //Update company status
    app.patch('/api/companies/:id',  logger, verifyToken, async (req, res) => {
        const id = req.params.id;
        const updatedCompany = req.body;
        const filter = { _id: new ObjectId(id) }
        const updatedDoc = {
            $set: {
                status: updatedCompany.status
            }
        }
        const result = await companyCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    // plans 
    app.get('/api/plans', async (req, res) => {
        const query = {}
        if (req.query.plan_id) {
            query.id = req.query.plan_id
        }
        const plan = await planCollection.findOne(query);
        res.send(plan)
    })


    // subscription 
    app.post('/api/subscriptions', async (req, res) => {
        const data = req.body;
        const subsInfo = {
            ...data,
            createdAt: new Date()
        }

        const result = await subscriptionCollection.insertOne(subsInfo);

        // update the user plan information
        const filter = { email: data.email };
        // update the value of the 'quantity' field to 5
        const updateDocument = {
            $set: {
                plan: data.planId,
            },
        };

        const updateResult = await userCollection.updateOne(filter, updateDocument);
        res.send(updateResult)
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
