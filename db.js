/* IndexedDB wrapper for lotericas data */

const DB_NAME = 'lotericasDB';
const DB_VERSION = 1;
const STORE_RECORDS = 'records';
const STORE_META = 'meta';

function openDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e)=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE_RECORDS)){
        db.createObjectStore(STORE_RECORDS, {keyPath:'cod_ul'});
      }
      if(!db.objectStoreNames.contains(STORE_META)){
        db.createObjectStore(STORE_META, {keyPath:'key'});
      }
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

function withStore(db, storeName, mode, fn){
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try{
      result = fn(store);
    } catch (err){
      reject(err);
      return;
    }
    tx.oncomplete = ()=> resolve(result);
    tx.onerror = ()=> reject(tx.error || new Error('Transaction failed'));
  });
}

async function getAllRecords(db){
  return withStore(db, STORE_RECORDS, 'readonly', (store)=>{
    return new Promise((resolve, reject)=>{
      const req = store.getAll();
      req.onsuccess = ()=> resolve(req.result || []);
      req.onerror = ()=> reject(req.error);
    });
  });
}

async function putManyRecords(db, records){
  return withStore(db, STORE_RECORDS, 'readwrite', (store)=>{
    for(const r of records) store.put(r);
  });
}

async function putRecord(db, record){
  return withStore(db, STORE_RECORDS, 'readwrite', (store)=> store.put(record));
}

async function deleteRecord(db, codUl){
  return withStore(db, STORE_RECORDS, 'readwrite', (store)=> store.delete(codUl));
}

async function clearRecords(db){
  return withStore(db, STORE_RECORDS, 'readwrite', (store)=> store.clear());
}

async function setMeta(db, key, value){
  return withStore(db, STORE_META, 'readwrite', (store)=> store.put({key, value}));
}

async function getMeta(db, key){
  return withStore(db, STORE_META, 'readonly', (store)=>{
    return new Promise((resolve, reject)=>{
      const req = store.get(key);
      req.onsuccess = ()=> resolve(req.result ? req.result.value : null);
      req.onerror = ()=> reject(req.error);
    });
  });
}

async function clearMeta(db){
  return withStore(db, STORE_META, 'readwrite', (store)=> store.clear());
}

async function exportDBAsJson(db){
  const [records, meta] = await Promise.all([
    getAllRecords(db),
    withStore(db, STORE_META, 'readonly', (store)=>{
      return new Promise((resolve, reject)=>{
        const req = store.getAll();
        req.onsuccess = ()=> resolve(req.result || []);
        req.onerror = ()=> reject(req.error);
      });
    }),
  ]);
  return {records, meta};
}

async function importDbJson(db, payload){
  const records = Array.isArray(payload.records) ? payload.records : [];
  const metaList = Array.isArray(payload.meta) ? payload.meta : [];
  await Promise.all([clearRecords(db), clearMeta(db)]);
  await putManyRecords(db, records);
  await withStore(db, STORE_META, 'readwrite', (store)=>{
    for(const item of metaList){
      if(item && item.key) store.put(item);
    }
  });
}
