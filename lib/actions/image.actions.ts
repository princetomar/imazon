"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";
import User from "../database/models/user.model";
import Image from "../database/models/image.model";
import { redirect } from "next/navigation";

const populateUser = (query: any) =>
  query.populate({
    path: "author",
    model: User,
    select: "_id firstName lastName",
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

    if (!imageToUpdate || imageToUpdate.authod.toHexString() !== userId) {
      throw new Error("Unauthorized or Image not found!");
    }

    const updatedImage = await Image.findByIdAndUpdate(
      imageToUpdate._id,
      image,
      {
        new: true,
      }
    );

    // To show the newly image created and not just keeps the cached image or file
    revalidatePath(path);

    return JSON.parse(JSON.stringify(updateImage));
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
