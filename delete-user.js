/**
 * Script to manually delete a specific user
 */

// Make a direct API call to delete the user
const userToDelete = "elliottwakefield1987@googlemail.com";

fetch("http://localhost:5000/api/debug/users")
  .then(res => res.json())
  .then(users => {
    const user = users.find(u => u.email === userToDelete);
    if (user) {
      console.log(`Found user: ${user.username} (ID: ${user.id})`);
      console.log("Attempting to delete...");
      
      // Since the storage is in-memory, we'll need to restart the server to clear it
      // Or we can try to access the storage directly through the running process
      console.log("User found with ID:", user.id);
      console.log("You may need to restart the application to clear the in-memory storage");
    } else {
      console.log("User not found");
    }
  })
  .catch(err => console.error("Error:", err));