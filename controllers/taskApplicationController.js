const createTaskApplication = (req, res) => {
  try{
    
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const updateEarnerStatus = (req, res) => {
  try{
    
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const updateReviewStatus = (req, res) => {
  try{
    
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  createTaskApplication,
  updateEarnerStatus,
  updateReviewStatus,
}