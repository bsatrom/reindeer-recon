module.exports = async function (context, req) {
    data = context.bindings.locationStorage;

    const reindeerPoints = data
      .sort((first, second) => first.capture_time - second.capture_time)
      .reduce((previous, next) => {
        previous[next.reindeer] = previous[next.reindeer] || [];

        if (next.lon !== undefined && next.lat !== undefined) {
          previous[next.reindeer].push([next.lon, next.lat]);
        }

        return previous;
      }, Object.create(null));

    context.res = {
        body: reindeerPoints
    };
}