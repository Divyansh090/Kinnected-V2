import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import z from "zod";

const UserSchema = z.object({
    email: z.string().min(1, "Required").max(100),
    name: z.string().min(1, "Required").max(20),
    password: z.string().min(8, "Password must be 8 characters long"),
})

export async function POST(req: Request){
    try {
        const body = await req.json(); // read the request of body
        const {email, name, password} = UserSchema.parse(body); // validate and extract the data

        const existingUser = await prisma.user.findUnique({
            where: {email: email}
        });

        if(existingUser){
            return NextResponse.json({user:null, message: "User already exist"}, {status:(409)})
        }

        const hashedPassword = await hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword
            }
        });

        const {password:_, ...rest} = newUser; // password:_ is used for removing password form the showing output
        return NextResponse.json({user: rest, message:"user Created Successfully"}, {status:(200)})
    } catch (error) {
        console.log(error)
        return NextResponse.json({message:"Some error occur while creating User"}, {status:(500)})
    }
}