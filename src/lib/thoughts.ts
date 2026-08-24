import {
  addDoc,
  collection,
  type FirestoreError,
  getDocs,
  orderBy,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Timestamp,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase";

export type ThoughtRecord = {
  content: string;
  emotion: string;
  place: string;
  userId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export type Thought = ThoughtRecord & {
  id: string;
};

export type ThoughtInput = {
  content: string;
  emotion: string;
  place: string;
  userId: string;
};

const THOUGHTS_COLLECTION = "thoughts";

function getThoughtsCollection() {
  return collection(getFirebaseDb(), THOUGHTS_COLLECTION);
}

export async function createThought(input: ThoughtInput) {
  return addDoc(getThoughtsCollection(), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listThoughts() {
  const thoughtsQuery = query(
    getThoughtsCollection(),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(thoughtsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as Thought[];
}

export function subscribeThoughts(
  userId: string,
  onChange: (thoughts: Thought[]) => void,
  onError?: (error: FirestoreError) => void,
) {
  const thoughtsQuery = query(
    getThoughtsCollection(),
    where("userId", "==", userId),
  );

  return onSnapshot(
    thoughtsQuery,
    (snapshot) => {
      const thoughts = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...(document.data() as ThoughtRecord),
        }))
        .sort((left, right) => {
          const leftTime = left.createdAt?.toMillis?.() ?? 0;
          const rightTime = right.createdAt?.toMillis?.() ?? 0;
          return rightTime - leftTime;
        });

      onChange(thoughts);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
}