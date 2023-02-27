const TelegramBot = require('node-telegram-bot-api');
const keys=require('./tokens');
const moment= require('moment') 
const mongoose = require('mongoose');
const axios = require('axios');

const bot = new TelegramBot(keys.telebotkey, { polling: true });

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = [keys.judge0key1, keys.judge0key2, keys.judge0key3][Math.floor(Math.random() * 3)];;

const MONGODB_URI = keys.mongouri;
mongoose.set('strictQuery', false);
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
    chatId: {
        type: Number,required: true,unique: true
    },
    name: {
        type: String,required: true
    },
    username: {
        type: String,required: true,unique: true
    },
    country: {
        type: String,required: true
    },
    university: {
        type: String,required: true
    },
    createdAt: {
        type: Date,default: Date.now
    },
    lastSubmission: {
        type: Date,default: null
    },
    streak: {
        type: Number,default: 0
    },
    maxStreak: {
        type: Number,default: 0
    },
    points:{
        type: Number,default: 0
    }

});

const User = mongoose.model('User', UserSchema);

const question = {
  test_question: "Test: One hot summer day Pete and his friend Billy decided to buy a watermelon. They chose the biggest and the ripest one, in their opinion. After that the watermelon was weighed, and the scales showed w kilos. They rushed home, dying of thirst, and decided to divide the berry, however they faced a hard problem. Pete and Billy are great fans of even numbers, that is why they want to divide the watermelon in such a way that each of the two parts weighs even number of kilos, at the same time it is not obligatory that the parts are equal. The boys are extremely tired and want to start their meal as soon as possible, that is why you should help them and find out, if they can divide the watermelon in the way they want. For sure, each of them should get a part of positive weight.\n \nExample:\nInput:8\nOutput:YES",
  test_input : "8",
  test_output: "YES"
};

languageId = -1;
sourceCode = "";
check=true;

//code compiler main function
const compileAndRunCode = async (languageId, sourceCode, input) => {
    try {
      const response = await axios.post(
        `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
        {
          source_code: sourceCode,
          language_id: languageId,
          stdin: input,
        },
        {
          headers: {
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            'X-RapidAPI-Key': JUDGE0_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
  
      const { stdout, stderr, compile_output, memory, time } = response.data;
        
      if (stderr) {
        return { error: stderr };
      } else if (compile_output) {
        return { error: compile_output };
      } else {
        return { output: stdout, t_taken:time, m_taken: memory };
      }
    } catch (error) {
      console.error("error in submission");
    }
  };


//start function
bot.onText(/\/start/,async (msg) => {
    check=true;
    const chatId = msg.chat.id;
    const chatName=msg.chat.username;
    
    console.log(chatId+" "+chatName);
    User.findOne({ chatId: chatId }, (err, user) => {
        if (err) {
          console.log(err);
          bot.sendMessage(chatId, 'An error occurred. Please try again later.');
        }
        else if (user) {
            bot.sendMessage(chatId, `Welcome back, ${user.name}!`,{
                reply_markup: {
                    inline_keyboard: [
                    [
                        {
                        text: 'Yes, let\'s start!',
                        callback_data: 'compile-yes'
                        },
                        {
                        text: 'Not now',
                        callback_data: 'compile-no'
                        }
                    ]
                    ]
                }
            });
        } 
        else {
          bot.sendMessage(chatId, 'Welcome to my bot! To get started, please create a profile using the /create command.');
        }
    });
});
  
  //language selection funciton
bot.on('callback_query', (callbackQuery) => {
  check=true;
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;
  
  if (data === 'compile-yes') {
    axios.get(keys.sheetid)
    .then((response) => {
      const sheetData = response.data.content;
      // console.log(sheetData);
      const today = moment().format('DD/MM/YYYY');
      sheetData.forEach(row => {
        if (row[0] === today) {
          // console.log(`A: ${row[1]}, B: ${row[2]}, C: ${row[3]}`);
          question.test_question= row[1];
          question.test_input= row[2];
          question.test_output= row[3];
          console.log(question);
        }
      });
      bot.sendMessage(chatId, `Here is today\'s question:\n\n<b>${question.test_question}</b>
                              \nSelect a coding language: `, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Java',
              callback_data: 'language-java'
            },
            {
              text: 'C++',
              callback_data: 'language-cpp'
            },
            {
              text: 'Python',
              callback_data: 'language-python'
            }
          ]
        ]
      }
    });
    }).catch((error) => {
      console.log(error);
  });
  } else if (data === 'compile-no') {
    bot.sendMessage(chatId, 'No problem! Come Again');
  }
});

bot.on('callback_query', (callbackQuery) => {
  check=true;
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;

    if (data === 'language-java') {
      bot.sendMessage(chatId, 'You selected Java. Send you code enclosed in tilde signs (```). Use \/stop keyword to stop.');
      languageId=62;check=false;
    } else if (data === 'language-cpp') {
      bot.sendMessage(chatId, 'You selected C++. Send you code enclosed in tilde signs (```). Use \/stop keyword to stop.');
      languageId=54;check=false;
    } else if (data === 'language-python') {
      bot.sendMessage(chatId, 'You selected Python. Send you code enclosed in tilde signs (```). Use \/stop keyword to stop.');
      languageId=71;check=false;
    }
});

//check the output fucntion
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    console.log(chatId+" "+msg.text);
    if(text=='\/stop'){
      bot.sendMessage(chatId, 'No worries! Try again later.');
    }
    else if(!check){
        check=true;
        sourceCode = text;
        bot.sendMessage(chatId, 'Code Compiling');

        

          compileAndRunCode(languageId, sourceCode, question.test_input)
          .then((result) => {
              bot.sendMessage(chatId, `<code>Output:\n`+result.output+`\nTime Taken: `+result.t_taken+` Memory: `+result.m_taken+`</code>`, { parse_mode: 'HTML' });
              
              if(result.output==question.test_output){
                  
                  User.findOne({ chatId: chatId }, (err, user) => {
                      if (err) {
                          console.error(err);
                      } else if (user) {
                        try{
                          if(user.lastSubmission==null){
                              user.lastSubmission = new Date(Date.now());
                              user.streak = 1;
                              user.maxStreak=1;
                          }
                          else{
                              const today = new Date();
                              const date1 = moment(today, 'DD-MM-YYYY');
                              const date2 = moment(user.lastSubmission, 'DD-MM-YYYY');
                              // console.log(date1.format('DD-MM-YYYY')+" "+date2.format('DD-MM-YYYY'));
                              const diffDays = date1.diff(date2, 'days');
                              // const diffTime = Math.abs(today - user.lastSubmission);
                              // const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                              
                              if (diffDays === 1) {
                                  user.streak += 1;
                                  if (user.streak > user.maxStreak) {
                                      user.maxStreak = user.streak;
                                  }
                              } else if (diffDays > 2) {
                                  user.streak = 0;
                              }
                              
                              if(user.streak%7===0)user.points+=50;
                              else if(user.streak%30===0)user.points+=500;
                              else if(user.streak%365===0)user.points+=10000;

                              user.lastSubmission = new Date(Date.now())
                          }
                          bot.sendMessage(chatId, `Hurrayy!! Test Cases Accepted. Your current streak is ${user.streak}.`);
                          user.save((err) => {
                              if (err) {
                                  console.error(err);
                              }
                          });
                      }catch (err) {
                        console.error(err);
                      }
                    }
                });
            }  
        })
        .catch((error) => bot.sendMessage(chatId, 'An error occurred. Please recheck your submission.'));

        
        
    }
});

  //about function
bot.onText(/\/about/, (msg) => {
    check=true;
    const chatId = msg.chat.id;
    const chatName=msg.chat.username;
    bot.sendPhoto(chatId, 
        'https://www.linkpicture.com/q/Capture_210.jpg',
        {
            caption: `<code>Hi ${chatName}!!Introducing our Telegram coding challenge bot! Get ready to improve your coding skills with daily challenges tailored to all skill levels. With our user-friendly interface, you can create a personalized profile, view your rank, and write and execute code right within the bot. Join our community of like-minded coders and take your skills to the next level!</code>`,
            parse_mode: 'HTML'
        })
        .then((message) => {})
        .catch((error) => {
            console.error(error);
        });
});


//create user profile fucntion
bot.onText(/\/create/, (msg) => {
    const chatId = msg.chat.id;
    const user = {};
    bot.sendMessage(chatId, 'Please enter your full name:');
    bot.on('message', (msg) => {
      if (msg.chat.id === chatId) {
        if (!user.name) {
          user.name = msg.text;
          bot.sendMessage(chatId, `Hello, ${user.name}! Please enter a unique username:`);
        } else if (!user.username) {
          User.findOne({ username: msg.text }, (err, existingUser) => {
            if (existingUser) {
              bot.sendMessage(chatId, 'This username is already taken. Please choose a different one.');
            } else {
              user.username = msg.text;
              bot.sendMessage(chatId, 'Please enter your country:');
            }
          });
        } else if (!user.country) {
          user.country = msg.text;
          bot.sendMessage(chatId, 'Please enter the name of your university:');
        } else if (!user.university) {
          user.university = msg.text;
  
          const newUser = new User({
            chatId: chatId,
            name: user.name,
            username: user.username,
            country: user.country,
            university: user.university,
            lastSubmission: null,
            streak: 0,
            maxStreak: 0,
            points: 0
          });
  
          newUser.save((err) => {
            if (err) {
              console.log(err);
              bot.sendMessage(chatId, 'An error occurred. Please try again later.');
            } else {
              bot.sendMessage(chatId, 'Your profile has been created! You can /start again. Happy Coding.');
            }
          });
        }
      }
    });
  });

  bot.onText(/\/profile/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const user = await User.findOne({ chatId });
      if (!user) {
        bot.sendMessage(chatId, "No profile found. Please create a profile using the \/create command.");
        return;
      }
      const profileDetails='';
      if(user.lastSubmission===null){
          profileDetails = `<code>Here's everything about you we know!!\n`+
                             `<b>Name:</b> ${user.name}\n` +
                             `<b>Username:</b> ${user.username}\n` +
                             `<b>Country:</b> ${user.country}\n` +
                             `<b>University:</b> ${user.university}\n` +
                             `<b>Profile Created:</b> ${user.createdAt.toLocaleDateString('en-GB')}\n` +
                             `<b>Last Submission:</b> No submissions yet\n` +
                             `<b>Streak:</b> ${user.streak}\n` +
                             `<b>Max Streak:</b> ${user.maxStreak}\n`+
                             `<b>Points:</b> ${user.points}\n</code>`;
      }
      else profileDetails = `<code>Here's everything about you we know!!\n`+
                             `<b>Name:</b> ${user.name}\n` +
                             `<b>Username:</b> ${user.username}\n` +
                             `<b>Country:</b> ${user.country}\n` +
                             `<b>University:</b> ${user.university}\n` +
                             `<b>Profile Created:</b> ${user.createdAt.toLocaleDateString('en-GB')}\n` +
                             `<b>Last Submission:</b> ${user.lastSubmission.toLocaleDateString('en-GB')}\n` +
                             `<b>Streak:</b> ${user.streak}\n` +
                             `<b>Max Streak:</b> ${user.maxStreak}\n`+
                             `<b>Points:</b> ${user.points}\n</code>`;
      bot.sendMessage(chatId, profileDetails, { parse_mode: 'HTML' });
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, 'An error occurred. Please recheck your submission.');
    }
  });

  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const profileDetails = `<code>Here are all the prompts you can use:\n \n`+
                             `\/start: To start your daily coding chanllenge.\n` +
                             `\/create: To create your profile on the bot.\n` +
                             `\/profile: View Your profile.\n` +
                             `\/about: To know more about the bot\n` +
                             `\/help: To get help.\n \n` +
                             `Product by <b>Alfred_io</b>. All rights reserved.</code>`
      bot.sendMessage(chatId, profileDetails, { parse_mode: 'HTML' });
  });


process.on("unhandledRejection", (error) => {
  console.error("Unhandled Promise Rejection:", error);
});
