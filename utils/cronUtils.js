const cron = require("node-cron");
const Discount = require('../models/discountModel')
const TableStat = require('../models/tableStatModel')

//upd disc to exp
const updateExpiredDiscounts = async () => {
  try {
    const currentDate = new Date();

    const result = await Discount.updateMany(
      { expiryDate: { $lt: currentDate }, status: { $ne: "Used" } },
      { $set: { status: "Expired" } }
    );

    console.log(`Updated ${result.modifiedCount} expired discounts.`);
  } catch (error) {
    console.error("Error updating expired discounts:", error.message);
  }
};

//del tbl stats
const deleteOutdatedTableStats = async () => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const result = await TableStat.deleteMany({
      date: { $lt: currentDate },
    });

    console.log(`Deleted ${result.deletedCount} outdated TableStats.`);
  } catch (error) {
    console.error("Error deleting outdated TableStats:", error.message);
  }
};

cron.schedule("0 0 * * *", () => {
  updateExpiredDiscounts();
  deleteOutdatedTableStats();
});

(async () => {
  await updateExpiredDiscounts();
  await deleteOutdatedTableStats();
})();
