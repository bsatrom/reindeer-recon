module.exports = async function (context, req) {
    context.log('Processed Location Data from Notehub.');

    context.bindings.locationStorage = req.body;

    const name = (req.query.name || (req.body && req.body.reindeer));
    const responseMessage = name
        ? "Location for " + name + " received."
        : "Location received.";

    context.res = {
        body: responseMessage
    };
}