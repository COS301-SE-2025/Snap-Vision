import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '60s', target: 5 },
    { duration: '120s', target: 20 },
    { duration: '180s', target: 50 },
    { duration: '60s', target: 50 },
    { duration: '60s', target: 0 },    
  ],
};

const BASE_URL = 'https://snap-vision-backend--snap-vision-f6954.europe-west4.hosted.app';

const testRoutes = [
  { start: '28.2314,-25.7545', end: '28.2320,-25.7550' },
  { start: '28.2300,-25.7530', end: '28.2350,-25.7570' },
  { start: '28.2280,-25.7500', end: '28.2330,-25.7580' },
  { start: '28.2250,-25.7480', end: '28.2310,-25.7560' },
  { start: '28.2200,-25.7450', end: '28.2280,-25.7540' },
];

export default function () {
  const route = testRoutes[Math.floor(Math.random() * testRoutes.length)];
  const url = `${BASE_URL}/api/directions?start=${route.start}&end=${route.end}`;
  
  let res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
    'has route data': (r) => r.json('features') && r.json('features').length > 0,
  });

  sleep(Math.random() * 5 + 3); 
}