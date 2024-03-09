"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";
import User from "../database/models/user.model";
import Image from "../database/models/image.model";
import { redirect } from "next/navigation";

// FOR GET ALL IMAGES FUNCTION
import { v2 as cloudinary } from "cloudinary";

const populateUser = (query: any) =>
  query.populate({
    path: "author",
    model: User,
    select: "_id firstName lastName clerkId",
  });

// THIS SERVER FILE CONTAINS MANY DIFFERENT SERVER ACTIONS SUCH AS :
// ADD IMAGES, UPDATE AND DELETE THEM & GET IMAGE INFORMATION BY ID

// 1. To add image to db
export async function addImage({ image, userId, path }: AddImageParams) {
  try {
    await connectToDatabase();

    // CONNECT IMAGE TO THE AUTHOR/USER WHO CREATED IT.
    const author = await User.findById(userId);
    if (!author) {
      throw new Error("User not found");
    }

    const newImage = await Image.create({
      ...image,
      author: author._id,
    });

    // To show the newly image created and not just keeps the cached image or file
    revalidatePath(path);

    return JSON.parse(JSON.stringify(newImage));
  } catch (error) {
    handleError(error);
  }
}

// 1. To upadte image to db
export async function updateImage({ image, userId, path }: UpdateImageParams) {
  try {
    await connectToDatabase();

    const imageToUpdate = await Image.findById(image._id);

    if (!imageToUpdate || imageToUpdate.author.toHexString() !== userId) {
      throw new Error("Unauthorized or image not found");
    }

    const updatedImage = await Image.findByIdAndUpdate(
      imageToUpdate._id,
      image,
      { new: true }
    );

    revalidatePath(path);

    return JSON.parse(JSON.stringify(updatedImage));
  } catch (error) {
    handleError(error);
  }
}

// 1. To delete image to db
export async function deleteImage(imageId: string) {
  try {
    await connectToDatabase();

    // To show the newly image created and not just keeps the cached image or file
    await Image.findByIdAndDelete(imageId);
  } catch (error) {
    handleError(error);
  } finally {
    redirect("/");
  }
}

// 1. To get image by id from db
export async function getImageByID(imageId: string) {
  try {
    await connectToDatabase();

    // To show the newly image created and not just keeps the cached image or file
    const image = await populateUser(Image.findById(imageId));

    if (!image) {
      throw new Error("Unauthorized or Image not found!");
    }
    return JSON.parse(JSON.stringify(image));
  } catch (error) {
    handleError(error);
  }
}

// GET ALL IMAGES
export async function getAllImages({
  limit = 9,
  page = 1,
  searchQuery = "",
}: {
  limit?: number;
  page: number;
  searchQuery?: string;
}) {
  try {
    await connectToDatabase();
    // config the cloudinary instance to pull the images from server
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    let expression = "folder=imazon";
    if (searchQuery) {
      expression += ` AND ${searchQuery}`;
    }

    // To get back all the resources from cloudinary
    const { resources } = await cloudinary.search
      .expression(expression)
      .execute();
    // To get from our db

    const resourceIds = resources.map((resource: any) => resource.public_id);

    // We have all the resources ids, query our own MONGODB  database for more information about each image
    let query = {};
    if (searchQuery) {
      query = {
        publicId: {
          $in: resourceIds,
        },
      };
    }

    const skipAmount = (Number(page) - 1) * limit;
    const images = await populateUser(Image.find(query))
      .sort({ updatedAt: -1 })
      .skip(skipAmount)
      .limit(limit);

    const totalImages = await Image.find(query).countDocuments();
    // Get total no. of all images in general
    const savedImages = await Image.find().countDocuments();

    return {
      data: JSON.parse(JSON.stringify(images)),
      totalPage: Math.ceil(totalImages / limit),
      savedImages,
    };
  } catch (error) {
    handleError(error);
  }
}

// GET IMAGES BY USER
export async function getUserImages({
  limit = 9,
  page = 1,
  userId,
}: {
  limit?: number;
  page: number;
  userId: string;
}) {
  try {
    await connectToDatabase();

    const skipAmount = (Number(page) - 1) * limit;

    const images = await populateUser(Image.find({ author: userId }))
      .sort({ updatedAt: -1 })
      .skip(skipAmount)
      .limit(limit);

    const totalImages = await Image.find({ author: userId }).countDocuments();

    return {
      data: JSON.parse(JSON.stringify(images)),
      totalPages: Math.ceil(totalImages / limit),
    };
  } catch (error) {
    handleError(error);
  }
}
