// /**
//  * @jest-environment detox/runners/jest/testEnvironment
//  */
// describe('Home Screen Performance', () => {
//   beforeAll(async () => {
//     await device.launchApp({ newInstance: true });
//   });

//   it('measures Home screen render time', async () => {
//     const start = Date.now();
//     await expect(element(by.id('home-screen'))).toBeVisible();
//     const end = Date.now();
//     const renderTime = end - start;
//     console.log('Home screen render time:', renderTime, 'ms');
//     expect(renderTime).toBeLessThan(2000); // Adjust threshold as needed
//   });

//   it('measures RecentlyVisitedCarousel render time', async () => {
//     const start = Date.now();
//     await expect(element(by.id('recently-visited-carousel'))).toBeVisible();
//     const end = Date.now();
//     const renderTime = end - start;
//     console.log('RecentlyVisitedCarousel render time:', renderTime, 'ms');
//     expect(renderTime).toBeLessThan(2000); // Adjust threshold as needed
//   });
// });
