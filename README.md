# clone repo
git clone "https://github.com/Prap1/assesement-backend.git"
cd directory

# create .env file
Create a .env file in the root directory and add the following
MONGO_URI=""
JWT_SECRET=your_default_secret
JWT_EXPIRES_IN=1D
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# download stripe 
https://github.com/stripe/stripe-cli/releases/tag/v1.27.0
set the path of stripe in the enviroment variable

# install dependencies
npm install

# Start Stripe Webhook Listener
stripe listen --forward-to localhost:8000/api/webhook
This will generate a webhook secret. Copy it and paste it into your .env file under:
STRIPE_WEBHOOK_SECRET=whsec_...

#  Run the Project
npm run dev
