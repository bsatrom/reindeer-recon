module.exports = async function (context, req) {
    context.res = {
        body: context.bindings.locationStorage
    };
}