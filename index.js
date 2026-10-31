import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
  console.log('logger middleware logged', req.params);
  next();
};

// The MongoDB driver connects automatically on the first operation,
// so there is no need to wrap everything in an async connect function.
// Creating the client at module level lets Vercel reuse it between requests.
const client = new MongoClient(process.env.MONGO_DB_URI);
const database = client.db('hireloop_db');

const jobCollection = database.collection('jobs');
const companyCollection = database.collection('companies');
const userCollection = database.collection('user');
const applicationsCollection = database.collection('applications');
const planCollection = database.collection('plans');
const subscriptionCollection = database.collection('subscriptions');
const sessionCollection = database.collection('session');

// ---------- auth middleware ----------
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  const session = await sessionCollection.findOne({ token });
  if (!session) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  // If your user _id is an ObjectId but session.userId is a string,
  // use: { _id: new ObjectId(session.userId) }
  const user = await userCollection.findOne({ _id: session.userId });
  if (!user) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  req.user = user;
  next();
};

const verifySeeker = (req, res, next) => {
  if (req.user?.role !== 'seeker') {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
};

const verifyRecruiter = (req, res, next) => {
  if (req.user?.role !== 'recruiter') {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
};

const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
};

// ---------- routes ----------
app.get('/', (req, res) => {
  res.send('This is the hireloop server.');
});

app.get('/api/users', async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

// jobs
app.get('/api/jobs', async (req, res) => {
  const query = {};
  if (req.query.companyId) query.companyId = req.query.companyId;
  if (req.query.status) query.status = req.query.status;
  const result = await jobCollection.find(query).toArray();
  res.send(result);
});

app.get('/api/jobs/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: 'invalid job id' });
  }
  const result = await jobCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.post('/api/jobs', async (req, res) => {
  const newJob = { ...req.body, createdAt: new Date() };
  const result = await jobCollection.insertOne(newJob);
  res.send(result);
});

// applications
app.get('/api/applications', verifyToken, verifySeeker, async (req, res) => {
  const query = {};
  if (req.query.applicantId) {
    query.applicantId = req.query.applicantId;
    // make sure the user is only asking for their own applications
    if (req.user._id.toString() !== req.query.applicantId) {
      return res.status(403).send({ message: 'forbidden access' });
    }
  }
  if (req.query.jobId) query.jobId = req.query.jobId;
  const result = await applicationsCollection.find(query).toArray();
  res.send(result);
});

app.post('/api/applications', async (req, res) => {
  const newApplication = { ...req.body, createdAt: new Date() };
  const result = await applicationsCollection.insertOne(newApplication);
  res.send(result);
});

// companies
app.get('/api/companies', verifyToken, async (req, res) => {
  const result = await companyCollection.find().toArray();
  res.send(result);
});

app.get('/api/my/companies', async (req, res) => {
  const query = {};
  if (req.query.recruiterId) query.recruiterId = req.query.recruiterId;
  const result = await companyCollection.findOne(query);
  res.send(result || {});
});

app.post('/api/companies', async (req, res) => {
  const newCompany = { ...req.body, createdAt: new Date() };
  const result = await companyCollection.insertOne(newCompany);
  res.send(result);
});


app.get('/api/allCompanies', async (req, res) => {
  const result = await companyCollection.find().toArray();
  res.send(result);
});

// update company status
app.patch('/api/companies/:id', logger, verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: 'invalid company id' });
  }
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = { $set: { status: req.body.status } };
  const result = await companyCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

// plans
app.get('/api/plans', async (req, res) => {
  const query = {};
  if (req.query.plan_id) query.id = req.query.plan_id;
  const plan = await planCollection.findOne(query);
  res.send(plan);
});

// subscriptions
app.post('/api/subscriptions', async (req, res) => {
  const data = req.body;
  const subsInfo = { ...data, createdAt: new Date() };
  await subscriptionCollection.insertOne(subsInfo);

  // update the user's plan
  const filter = { email: data.email };
  const updateDocument = { $set: { plan: data.planId } };
  const updateResult = await userCollection.updateOne(filter, updateDocument);
  res.send(updateResult);
});

// ---------- error handler (so failures return JSON instead of crashing) ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({ message: 'internal server error' });
});

// Only listen when running locally. On Vercel the platform handles this.
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

// Vercel needs the app exported
export default app;