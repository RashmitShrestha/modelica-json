within evalAndArrays;

block OneDimArray "An array of instances with an array of the same size as output"

  parameter Integer nZon = 3 "# of zones";
  parameter Real k[nZon] = {i for i in 1:nZon} "Seen as {1, 2, 3}";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u[nZon] "Input of each zone";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y[nZon] "Output of each zone";

  Buildings.Controls.OBC.CDL.Reals.MultiplyByParameter multer[nZon](
    final k=k) "One instance per zone, expect k = {1, 2, 3}";

equation
  connect(u, multer.u);
  connect(multer.y, y);

end OneDimArray;
