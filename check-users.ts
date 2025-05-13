import { storage } from './server/storage';

async function checkUsers() {
  const users = await storage.getAllUsers();
  console.log('All users in the system:');
  users.forEach(user => {
    console.log(` - Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Admin: ${user.isAdmin}`);
    console.log(`   Password format: ${user.password.includes(':') ? 'Correct (salt:hash)' : 'Invalid'}`);
    console.log(`   Email verified: ${user.emailVerified}`);
    console.log('---');
  });
}

checkUsers();