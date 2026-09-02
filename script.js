// Import Firebase modules via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBpD0ktHCtDsZzqawEqAaR840cpDFTa6BQ",
  authDomain: "expenses-app-15226.firebaseapp.com",
  projectId: "expenses-app-15226",
  storageBucket: "expenses-app-15226.firebasestorage.app",
  messagingSenderId: "1075940197546",
  appId: "1:1075940197546:web:a89e55c24bf2ef732c3cd3",
  measurementId: "G-1VFF71CK93"
};

// Initialize Firebase and Firestore Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const expensesCollection = collection(db, "expenses");

// 1. Function to save a new expense to Firestore
export async function addExpense(title, amount, category) {
  try {
    const docRef = await addDoc(expensesCollection, {
      title: title,
      amount: Number(amount),
      category: category || "General",
      createdAt: serverTimestamp()
    });
    console.log("Expense saved with ID:", docRef.id);
    await loadExpenses(); // Refresh the list
  } catch (error) {
    console.error("Error adding expense: ", error);
  }
}

// 2. Function to load all expenses from Firestore
export async function loadExpenses() {
  try {
    const q = query(expensesCollection, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const expenses = [];
    querySnapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() });
    });

    console.log("Loaded expenses:", expenses);
    renderExpenses(expenses);
  } catch (error) {
    console.error("Error fetching expenses: ", error);
  }
}

// 3. Function to delete an expense by ID
export async function deleteExpense(id) {
  try {
    await deleteDoc(doc(db, "expenses", id));
    console.log("Expense deleted:", id);
    await loadExpenses(); // Refresh the list
  } catch (error) {
    console.error("Error removing expense: ", error);
  }
}

// 4. Function to render expenses to your HTML
function renderExpenses(expenses) {
  const listElement = document.getElementById("expense-list"); // Change to your HTML element ID
  if (!listElement) return;

  listElement.innerHTML = "";
  expenses.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.title} - $${item.amount} (${item.category})</span>
      <button onclick="window.deleteExpense('${item.id}')">Delete</button>
    `;
    listElement.appendChild(li);
  });
}

// Expose deleteExpense globally for inline HTML button clicks
window.deleteExpense = deleteExpense;

// Load data when page loads
window.addEventListener("DOMContentLoaded", loadExpenses);
