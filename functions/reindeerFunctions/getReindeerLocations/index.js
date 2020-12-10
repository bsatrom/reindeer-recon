module.exports = async function (context, req) {
  data = context.bindings.locationStorage;

  // Sort all reindeer location by reindeer
  const reindeerPoints = data
    .sort((first, second) => first.capture_time - second.capture_time)
    .reduce((previous, next) => {
      previous[next.reindeer] = previous[next.reindeer] || [];

      if (next.lon !== undefined && next.lat !== undefined) {
        previous[next.reindeer].push([next.lon, next.lat]);
      }

      return previous;
    }, Object.create(null));

  // Push the first location to the end so our route looks like a loop
  for (const deername in reindeerPoints) {
    const deer = reindeerPoints[deername];

    deer.push(deer[0]);
  }

  context.res = {
    body: reindeerPoints
   };
}