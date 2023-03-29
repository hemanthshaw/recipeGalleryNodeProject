const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const Image = require('../models/image');
const Like = require('../models/like');
const User = require('../models/User');
const contact = require('../models/contact');
const flash = require('connect-flash');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/auth/login');
  }

router.get('/', (req, res) => {
    res.render('landing', {user : req.user});
  });

  router.get('/contact', (req, res) => {
    res.render('contact');
  });

  router.get('/about', (req, res) => {
    res.redirect('/');
  });


  router.get('/images',ensureAuthenticated,async (req, res) => {
    try {
      const images = await Image.find();
      const imagesData = await Promise.all(images.map(async (image) => {
          const author = await User.findById(image.userId);
          const ingredients = image.ingredients.map(ingredient => ingredient.replace(/,/g, ' '));
          return {
            id :  image._id,
            name: image.name,
            description: image.description,
            ingredients: ingredients,
            image: `data:${image.contentType};base64,${image.image.toString('base64')}`,
            likes : image.likes,
            time : image.time,
            ingredients : ingredients,
            process : image.process,
            author : author
          };
        }));

      res.render('images', { recipes: imagesData, user:req.user  });
    } catch (err) {
      console.error(err);
      res.render('error');
    }
  });


router.get('/upload',ensureAuthenticated, (req, res) => {
  res.render('upload');
});

router.post('/upload',ensureAuthenticated,upload.single('image'), async (req, res) => {
  try {
    const imageBuffer = req.file.buffer;
    const resizedImage = await sharp(imageBuffer).resize(300,300).jpeg({ quality: 100 }).toBuffer();
 
   var amounts = req.body.amount;
  var ingredients = req.body.ingredient;

  // Combine amount and ingredient into an array of strings
  var recipe = amounts.map(function(amount, index) {
    return amount + ',' + ingredients[index];
  });
    const image = new Image({
      name: req.body.name,
      description: req.body.description,
      image: resizedImage,
      contentType: req.file.mimetype,
      ingredients: recipe,
      likes : req.body.likes,
      time : parseInt(req.body.time),
      process : req.body.process,
      userId: req.user._id
    });
    await image.save();
    res.redirect('/images');
  } catch (err) {
    console.error(err);
    res.render('error');
  }
});


// GET single Image
router.get('/recipe/:id', ensureAuthenticated, async (req, res) => {
    try {
      const image = await Image.findById(req.params.id);
      const author = await User.findById(image.userId);
      const ingredients = image.ingredients.map((ingredient) => ingredient.replace(/,/g, ' '));
      const recipe = {
        id: image._id,
        name: image.name,
        description: image.description,
        ingredients: ingredients,
        image: `data:${image.contentType};base64,${image.image.toString('base64')}`,
        likes: image.likes,
        time: image.time,
        process: image.process,
        author: author
      };
      res.render('recipe', { recipe: recipe, user: req.user, author: author });
    } catch (err) {
      console.error(err);
      res.render('error');
    }
  });


// DELETE image
router.delete('/delete/:id',ensureAuthenticated, async (req, res) => {
    try {
      await Image.findByIdAndDelete(req.params.id);
      res.redirect('/images');
    } catch (err) {
      console.error(err);
      res.render('error');
    }
  });

// GET image for update
router.get('/update/:id',ensureAuthenticated, async (req, res) => {
    try {
      const image = await Image.findById(req.params.id);
      const ingredientsArray = image.ingredients.map(ingredient => ingredient.split(','));
      console.log(ingredientsArray);
      const amounts = ingredientsArray.map(ingredient => ingredient[0].trim());
      const ingredients = ingredientsArray.map(ingredient => ingredient[1].trim());
      res.render('update', { image : image, amounts: amounts, ingredients: ingredients });
    } catch (err) {
      console.error(err);
      res.render('error');
    }
  });


// PUT update image
router.patch('/update/:id',ensureAuthenticated, upload.single('image'), async (req, res) => {
    try {
      const { name, description, time, process } = req.body;
      var amounts = req.body.amount;
      var ingredients = req.body.ingredient;

  // Combine amount and ingredient into an array of strings
  var recipe = amounts.map(function(amount, index) {
    return amount + ' ' + ingredients[index];
  });
      const updatedImage = {
        name,
        description,
        ingredients: recipe,
        time,
        process,
        likes:0,
        userId:req.user._id,
        created_at: Date.now()
      };
      if (req.file) {
        const resizedImage = await sharp(req.file.buffer).resize(200,200).toBuffer();
        updatedImage.image = resizedImage;
        updatedImage.contentType = req.file.mimetype;
      }
      await Image.findByIdAndUpdate(req.params.id, updatedImage);
      res.redirect('/images');
    } catch (err) {
      console.error(err);
      res.render('error');
    }
  });


  // Search images
router.get('/search', ensureAuthenticated,async (req, res) => {
    try {
      const query = req.query.q; // get the search query
      const regex = new RegExp(query, 'i'); // create a regex pattern to match the query
      const images = await Image.find({ name: regex }).sort({ createdAt: 'desc' }); // find images that match the query
      const imagesData = await Promise.all(images.map(async (image) => {
          const author = await User.findById(image.userId);
          return {
            id :  image._id,
            name: image.name,
            description: image.description,
            ingredients: image.ingredients,
            image: `data:${image.contentType};base64,${image.image.toString('base64')}`,
            likes : image.likes,
            time : image.time,
            process : image.process,
            author : author
          };
        }));
      res.render('images', { recipes: imagesData, user : req.user  }); // render the index template with the matching images
    } catch (err) {
      console.error(err);
      res.render('error');
    }
  });

// POST like image
router.post('/like/:imageId', ensureAuthenticated, async (req, res) => {
  try {
    const imageId = req.params.imageId;
    const userId = req.user._id;

    // Check if user has already liked the image
    const existingLike = await Like.findOne({ user: userId, image: imageId });

    if (existingLike) {
      // If user has already liked the image, remove the like
      await Like.findByIdAndDelete(existingLike._id);
      await Image.findByIdAndUpdate(imageId, { $inc: { likes: -1 } }); // Decrease likes by 1
    } else {
      // If user has not liked the image, add the like
      const newLike = new Like({ user: userId, image: imageId });
      await newLike.save();
      await Image.findByIdAndUpdate(imageId, { $inc: { likes: 1 } }); // Increase likes by 1
    }

    // Get the updated image from the DB and send it to the client
    const updatedImage = await Image.findById(imageId);
    const likes = Math.max(0, updatedImage.likes);

    res.json({ likes: likes });

  } catch (err) {
    console.error(err);
    res.render('error');
  }
});


// Search images uploaded by a user
router.get('/user-images/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId; // get the user ID from the request parameters
    const images = await Image.find({ userId: userId }).sort({ createdAt: 'desc' }); // find images uploaded by the user
    const user = await User.findById(userId); // get the user information
    const imagesData = await Promise.all(images.map(async (image) => {
      return {
        id: image._id,
        name: image.name,
        description: image.description,
        ingredients: image.ingredients,
        image: `data:${image.contentType};base64,${image.image.toString('base64')}`,
        likes: image.likes,
        time: image.time,
        process: image.process,
        author: user
      };
    }));
    res.render('profile', { recipes: imagesData, user: req.user }); // render the images template with the matching images and user information
  } catch (err) {
    console.error(err);
    res.render('error');
  }
});


router.get('/contact', async (req, res) => {
  const message = "Welcome to the contact page!";
  res.render('contact', { message });
});


  // POST route to store analytics or issues data in database
  router.post('/contact', async (req, res) => {
    try {
      // Extract the data from the request body
      const { name, email, message } = req.body;

      // Create a new analytics document using the data
      const analytics = new contact({ name, email, message });

      // Save the analytics document to the database
      await analytics.save();
      // Send a success response to the client with a flash message
      res.render('contact', {message});

    } catch (err) {
      // Send an error response to the client
      console.error(err);
      res.render('error');
    }
  });

  const sortByNameAndLikes = async (filter) => {
    try {
      const images = await Image.find();
      console.log(images.length);
      // Sort by name
      if (filter === 'name_asc') {
        images.sort((a, b) => a.name.localeCompare(b.name));
      } else if (filter === 'name_desc') {
        images.sort((a, b) => b.name.localeCompare(a.name));
      }

      // Sort by likes
      if (filter === 'likes_asc') {
        images.sort((a, b) => a.likes - b.likes);
      } else if (filter === 'likes_desc') {
        images.sort((a, b) => b.likes - a.likes);
      }

      return images;
    } catch (err) {
      console.error(err);
      throw new Error('Failed to sort images');
    }
  };

  router.get('/sort-images/:filter', ensureAuthenticated, async (req, res) => {
    try {
      const filter = req.params.filter;
      const images = await sortByNameAndLikes(filter);
      const imagesData = await Promise.all(images.map(async (image) => {
        const author = await User.findById(image.userId);
        const ingredients = image.ingredients.map(ingredient => ingredient.replace(/,/g, ' '));
        return {
          id :  image._id,
          name: image.name,
          description: image.description,
          ingredients: ingredients,
          image: `data:${image.contentType};base64,${image.image.toString('base64')}`,
          likes : image.likes,
          time : image.time,
          ingredients : ingredients,
          process : image.process,
          author : author
        };
      }));
    res.render('images', { recipes: imagesData, user:req.user  });
    } catch (err) {
      console.error(err);
      res.render('error');
    }
  });


module.exports = router;
