
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

async function cleanup() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const targets = ['1776494999991', '1776494999992'];
  
  for (const id of targets) {
    console.log(`Deleting ghost document: ${id}...`);
    await deleteDoc(doc(db, 'schedules', id));
  }
  console.log("Cleanup complete.");
}

cleanup().catch(console.error);
