/**
  Current flash
*/
exports.flash = function (req, res) {
  return function (type) {
    if (req.currentFlash) {
      return req.currentFlash[type] || [];
    }
    return [];
  };
};