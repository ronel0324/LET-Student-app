import { setGlobalOptions } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

export const sendSyncNotification = onDocumentWritten(
  "notifications/latest",
  async (event) => {
    const data = event.data?.after.data();
    if (!data) return;

    await admin.messaging().send({
      notification: {
        title: data.title,
        body: data.message,
      },
      topic: "content_updates",
    });
  }
);