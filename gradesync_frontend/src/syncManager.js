import localforage from 'localforage';

localforage.config({
  name: 'GradeSyncOffline',
  storeName: 'sync_queue'
});

export const addToSyncQueue = async (url, method, payload) => {
  const currentQueue = await localforage.getItem('queue') || [];
  const newAction = {
    id: Date.now(),
    url,
    method,
    payload,
    timestamp: new Date().toISOString()
  };
  
  currentQueue.push(newAction);
  await localforage.setItem('queue', currentQueue);
  return newAction;
};

export const processSyncQueue = async () => {
  const queue = await localforage.getItem('queue') || [];
  if (queue.length === 0) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  };

  const remainingQueue = [];

  for (const action of queue) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: authHeaders,
        body: JSON.stringify(action.payload)
      });

      if (!response.ok) {

        console.error('Failed to sync action:', action);
        remainingQueue.push(action); 
      }
    } catch (error) {

      remainingQueue.push(action);
    }
  }

  await localforage.setItem('queue', remainingQueue);
  
  if (remainingQueue.length === 0) {
    console.log("GradeSync is fully synced with the cloud!");

    window.dispatchEvent(new CustomEvent('syncComplete'));
  }
};