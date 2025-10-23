# This CMakeLists.txt is currently only used to load project files for CLion.
cmake_minimum_required(VERSION 3.10)

project(chip-core)

# Only GME (Game Music Emu) is used now
add_subdirectory(game-music-emu)
