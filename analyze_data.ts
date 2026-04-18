
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

async function analyze() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const snapshot = await getDocs(collection(db, 'schedules'));
  const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  console.log(`Total documents: ${docs.length}`);

  const counts: Record<string, any[]> = {};
  const emptyDocs: any[] = [];
  
  docs.forEach(doc => {
    // Check if essential fields are missing
    if (!doc.teamName && !doc.date && !doc.leaderName) {
      emptyDocs.push(doc);
    }

    // Define a unique key for identifying duplicates
    const key = `${doc.teamName || 'EMPTY'}_${doc.date || 'EMPTY'}_${doc.location || 'EMPTY'}_${doc.leaderName || 'EMPTY'}_${doc.keyword || 'EMPTY'}`;
    if (!counts[key]) {
      counts[key] = [];
    }
    counts[key].push(doc);
  });

  if (emptyDocs.length > 0) {
    console.log(`\nFound ${emptyDocs.length} empty or near-empty documents:`);
    emptyDocs.forEach(d => {
      console.log(`  - ID: ${d.id}`);
      console.log(`    Team Name: "${d.teamName || '(비어있음)'}"`);
      console.log(`    Date: "${d.date || '(비어있음)'}"`);
      console.log(`    Location: "${d.location || '(비어있음)'}"`);
      console.log(`    Leader: "${d.leaderName || '(비어있음)'}"`);
      console.log(`    Keyword: "${d.keyword || '(비어있음)'}"`);
    });
  }

  const duplicates = Object.entries(counts).filter(([_, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log("\nNo exact duplicates found.");
  } else {
    console.log(`\nFound ${duplicates.length} sets of duplicates:`);
    duplicates.forEach(([key, list]) => {
      console.log(`Key: ${key}`);
      list.forEach(item => {
        console.log(`  - Doc ID: ${item.id}, Phone: ${item.phone}`);
      });
    });
  }
  
  // Also check for potential "loose" duplicates (same team, same date, different ID)
  const looseCounts: Record<string, any[]> = {};
  docs.forEach(doc => {
    const key = `${doc.teamName}_${doc.date}`;
    if (!looseCounts[key]) {
      looseCounts[key] = [];
    }
    looseCounts[key].push(doc);
  });
  
  // Check for same teamName occurring multiple times
  const teamCounts: Record<string, any[]> = {};
  docs.forEach(doc => {
    if (!doc.teamName) return;
    const key = doc.teamName;
    if (!teamCounts[key]) teamCounts[key] = [];
    teamCounts[key].push(doc);
  });

  console.log(`\nSpecific check for suspicious IDs:`);
  const suspiciousIds = ['1776494999991', '1776494999992'];
  docs.filter(d => suspiciousIds.includes(d.id)).forEach(d => {
    console.log(`ID: ${d.id}`);
    console.log(`  Team Name: "${d.teamName || ''}"`);
    console.log(`  Date: "${d.date || ''}"`);
    console.log(`  Location: "${d.location || ''}"`);
    console.log(`  Leader: "${d.leaderName || ''}"`);
  });
}

analyze().catch(console.error);
