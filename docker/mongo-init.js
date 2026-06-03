// Runs once when MongoDB container is first initialized
db = db.getSiblingDB('taxai');

db.createUser({
  user: 'taxai_app',
  pwd: 'taxai_app_secret',
  roles: [{ role: 'readWrite', db: 'taxai' }],
});

// Create initial collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'passwordHash', 'firstName', 'lastName', 'role', 'tenantId'],
      properties: {
        email: { bsonType: 'string' },
        tenantId: { bsonType: 'string' },
        role: { enum: ['user', 'ca', 'admin'] },
      },
    },
  },
});

// Placeholder collections for Day 2+
db.createCollection('documents');
db.createCollection('tax_records');
db.createCollection('gst_records');
db.createCollection('filings');
db.createCollection('audit_logs');
db.createCollection('notifications');

print('✅ TaxAI database initialized');