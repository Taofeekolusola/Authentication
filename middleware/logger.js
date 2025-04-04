const chalk = require("chalk");

const logger = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  let responseBody;

  res.send = function (body) {
    responseBody = body;
    res.send = originalSend;
    return res.send(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    console.log(chalk.magenta("-----------------------------------------------------"));
    console.log(chalk.cyan(`[${new Date().toISOString()}]`), chalk.green.bold(req.method), chalk.yellow(req.originalUrl));
    console.log(chalk.blue("Params:"), req.params);
    console.log(chalk.blue("Query:"), req.query);
    console.log(chalk.blue("Body:"), req.body);

    let statusColor;
    if (res.statusCode >= 500) {
      statusColor = chalk.red(res.statusCode);
    } else if (res.statusCode >= 400) {
      statusColor = chalk.yellow(res.statusCode);
    } else if (res.statusCode >= 300) {
      statusColor = chalk.hex("#FFA500")(res.statusCode);
    } else {
      statusColor = chalk.green(res.statusCode);
    }

    console.log(chalk.blue("Status:"), statusColor, chalk.gray(`- Duration: ${duration}ms`));
    console.log(chalk.blue("Response:"), tryParseJSON(responseBody));
    console.log(chalk.magenta("-----------------------------------------------------"));
  });

  next();
};

function tryParseJSON(body) {
  try {
    return typeof body === "string" ? JSON.parse(body) : body;
  } catch (e) {
    return body;
  }
}

module.exports = logger;