allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

// Keep Java and Kotlin bytecode targets aligned across Flutter plugins too.
subprojects {
    tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
        val javaTaskName = name.replace("Kotlin", "JavaWithJavac")
        val javaTarget = tasks.named<JavaCompile>(javaTaskName).get()
        compilerOptions.jvmTarget.set(
            org.jetbrains.kotlin.gradle.dsl.JvmTarget.fromTarget(
                javaTarget.targetCompatibility,
            ),
        )
        compilerOptions.languageVersion.set(
            org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_1_8,
        )
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
